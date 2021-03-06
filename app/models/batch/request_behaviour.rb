module Batch::RequestBehaviour
  def self.included(base)
    base.class_eval do
      has_many :batch_requests
      has_many :batches, :through => :batch_requests

      # Identifies all requests that are not part of a batch.
      named_scope :unbatched, {
        :joins      => 'LEFT OUTER JOIN batch_requests ubr ON `requests`.`id`=`ubr`.`request_id`',
        :readonly   => false,
        :conditions => '`ubr`.`request_id` IS NULL'
      }
    end
  end

  def batch_ids
    batch_requests.map(&:batch_id)
  end

  def position(batch)
    batch.batch_requests.detect { |br| br.request_id == self.id }.try(:position) || 0
  end

  def recycle_from_batch!(batch)
    self.detach!
    self.batches.delete(batch)
    #self.detach
    #self.batches -= [ batch ]
  end

  def create_batch_request!(attributes)
    batch_requests.create!(attributes)
  end

  def batch_request
    batch_requests.first
  end
end
